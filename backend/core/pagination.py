"""
Shared pagination configuration.

Centralising pagination here (instead of redefining it per-app) means every
list endpoint in the platform behaves consistently, and a future change to
page size / envelope shape only needs to happen in one place.
"""

from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class StandardResultsSetPagination(PageNumberPagination):
    """
    Standard page-number pagination with a client-overridable page size.

    Response envelope:
        {
            "count": 123,
            "total_pages": 11,
            "current_page": 2,
            "next": "http://.../?page=3",
            "previous": "http://.../?page=1",
            "results": [...]
        }
    """

    page_size = 12
    page_size_query_param = "page_size"
    max_page_size = 100

    def get_paginated_response(self, data):
        return Response(
            {
                "count": self.page.paginator.count,
                "total_pages": self.page.paginator.num_pages,
                "current_page": self.page.number,
                "next": self.get_next_link(),
                "previous": self.get_previous_link(),
                "results": data,
            }
        )
