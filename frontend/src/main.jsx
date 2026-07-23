/**
 * Application entry point.
 *
 * Wraps <App /> with:
 *   - Redux's <Provider> so every component in the tree can use
 *     useAppSelector/useAppDispatch.
 *   - React Router's <BrowserRouter> so route components can use
 *     useNavigate/useLocation/etc.
 * These two providers are set up here (not inside App.jsx) so that App.jsx
 * itself can freely use routing/Redux hooks (e.g. its useEffect dispatch)
 * without a chicken-and-egg provider ordering problem.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";

import "./index.css";
import App from "./App.jsx";
import { store } from "./app/store";
import ErrorBoundary from "./components/common/ErrorBoundary.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </BrowserRouter>
    </Provider>
  </StrictMode>
);
