/**
 * Auth slice — owns all authentication-related state:
 *   - the current user's profile
 *   - whether the user is authenticated
 *   - per-action loading/error status, so components can show spinners /
 *     inline error messages without each maintaining their own local state.
 *
 * Async thunks wrap the authApi calls and handle token persistence
 * (via utils/tokenStorage) on success, and toast notifications for a
 * consistent UX across every auth action rather than each page rolling its
 * own success/error messaging.
 */

import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import toast from "react-hot-toast";

import { authApi } from "../../api/authApi";
import { clearTokens, getAccessToken, setTokens } from "../../utils/tokenStorage";
import { extractErrorMessage } from "../../utils/apiErrors";

const initialState = {
  user: null,
  // Bootstrapped from localStorage so a page refresh doesn't briefly treat
  // a logged-in user as logged-out before fetchProfile resolves.
  isAuthenticated: Boolean(getAccessToken()),
  // True until the initial fetchProfile() call (triggered once at app
  // startup — see App.jsx) has settled. ProtectedRoute waits on this flag
  // so it never redirects a genuinely-logged-in user to /login just
  // because their profile hasn't loaded yet on a hard refresh.
  isInitializing: Boolean(getAccessToken()),
  status: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
};

/** Extracts a human-readable message from our normalised API error envelope. */
export const registerUser = createAsyncThunk("auth/register", async (payload, { rejectWithValue }) => {
  try {
    const data = await authApi.register(payload);
    toast.success(data.message || "Account created successfully.");
    return data.user;
  } catch (error) {
    const message = extractErrorMessage(error, "Registration failed.");
    toast.error(message);
    return rejectWithValue(message);
  }
});

export const loginUser = createAsyncThunk("auth/login", async (payload, { rejectWithValue }) => {
  try {
    // `rememberMe` is UI-only state (see LoginPage) — never sent to the
    // backend, only used here to choose the token storage backend.
    const { rememberMe = true, ...credentials } = payload;
    const data = await authApi.login(credentials);
    setTokens(data.tokens, rememberMe);
    toast.success("Welcome back!");
    return data.user;
  } catch (error) {
    const message = extractErrorMessage(error, "Login failed.");
    toast.error(message);
    return rejectWithValue(message);
  }
});

export const logoutUser = createAsyncThunk("auth/logout", async () => {
  try {
    const refresh = localStorage.getItem("ecommerce_refresh_token");
    if (refresh) await authApi.logout(refresh);
  } catch {
    // Even if the server call fails (e.g. token already expired), we still
    // want to clear local state — logout should always succeed client-side.
  } finally {
    clearTokens();
  }
  return null;
});

export const fetchProfile = createAsyncThunk("auth/fetchProfile", async (_, { rejectWithValue }) => {
  try {
    return await authApi.fetchProfile();
  } catch (error) {
    return rejectWithValue(extractErrorMessage(error, "Failed to load profile."));
  }
});

export const updateProfile = createAsyncThunk("auth/updateProfile", async (payload, { rejectWithValue }) => {
  try {
    const data = await authApi.updateProfile(payload);
    toast.success("Profile updated.");
    return data;
  } catch (error) {
    const message = extractErrorMessage(error, "Failed to update profile.");
    toast.error(message);
    return rejectWithValue(message);
  }
});

export const changePassword = createAsyncThunk("auth/changePassword", async (payload, { rejectWithValue }) => {
  try {
    const data = await authApi.changePassword(payload);
    toast.success(data.message || "Password changed.");
    return data;
  } catch (error) {
    const message = extractErrorMessage(error, "Failed to change password.");
    toast.error(message);
    return rejectWithValue(message);
  }
});

export const forgotPassword = createAsyncThunk("auth/forgotPassword", async (email, { rejectWithValue }) => {
  try {
    const data = await authApi.forgotPassword(email);
    toast.success(data.message || "Check your email for reset instructions.");
    return data;
  } catch (error) {
    const message = extractErrorMessage(error, "Request failed.");
    toast.error(message);
    return rejectWithValue(message);
  }
});

export const resetPassword = createAsyncThunk("auth/resetPassword", async (payload, { rejectWithValue }) => {
  try {
    const data = await authApi.resetPassword(payload);
    toast.success(data.message || "Password reset successfully.");
    return data;
  } catch (error) {
    const message = extractErrorMessage(error, "Reset failed. The link may have expired.");
    toast.error(message);
    return rejectWithValue(message);
  }
});

export const verifyEmail = createAsyncThunk("auth/verifyEmail", async (token, { rejectWithValue }) => {
  try {
    const data = await authApi.verifyEmail(token);
    toast.success(data.message || "Email verified.");
    return data.user;
  } catch (error) {
    const message = extractErrorMessage(error, "Verification failed. The link may have expired.");
    toast.error(message);
    return rejectWithValue(message);
  }
});

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    /** Clears any stale error message, e.g. when a user navigates away from a failed form. */
    clearAuthError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // --- register ---------------------------------------------------
      .addCase(registerUser.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state) => {
        state.status = "succeeded";
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      // --- login --------------------------------------------------------
      .addCase(loginUser.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
        state.isAuthenticated = false;
      })
      // --- logout -------------------------------------------------------
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.status = "idle";
      })
      // --- fetchProfile ---------------------------------------------------
      .addCase(fetchProfile.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.user = action.payload;
        state.isAuthenticated = true;
        state.isInitializing = false;
      })
      .addCase(fetchProfile.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
        // If the session is invalid, fetchProfile fails — treat this as
        // logged-out rather than leaving stale "authenticated" state.
        state.isAuthenticated = false;
        state.user = null;
        state.isInitializing = false;
      })
      // --- updateProfile --------------------------------------------------
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      // --- verifyEmail ----------------------------------------------------
      .addCase(verifyEmail.fulfilled, (state) => {
        if (state.user) state.user.is_email_verified = true;
      });
  },
});

export const { clearAuthError } = authSlice.actions;
export default authSlice.reducer;
