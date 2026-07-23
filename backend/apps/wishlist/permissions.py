"""
Permission classes for the wishlist domain.

Every wishlist endpoint already requires IsAuthenticated and scopes its
queryset to `request.user`, so no additional object-level permission class
is currently needed — this module is a placeholder for when/if an
admin-facing "view any user's wishlist" feature is added.
"""
