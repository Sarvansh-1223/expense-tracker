from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status


def custom_exception_handler(exc, context):
    """Wraps DRF's default handler to guarantee a consistent, friendly
    error payload shape: {"detail": "...", "errors": {...}}"""
    response = exception_handler(exc, context)

    if response is not None:
        data = {"detail": None, "errors": None}
        if isinstance(response.data, dict):
            if "detail" in response.data and len(response.data) == 1:
                data["detail"] = response.data["detail"]
            else:
                data["detail"] = "Validation failed."
                data["errors"] = response.data
        elif isinstance(response.data, list):
            data["detail"] = "Validation failed."
            data["errors"] = {"non_field_errors": response.data}
        else:
            data["detail"] = str(response.data)
        response.data = data
        return response

    return Response(
        {"detail": "An unexpected server error occurred.", "errors": None},
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
