from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette import status


class AppError(Exception):
    def __init__(self, code: str, message: str, status_code: int = status.HTTP_400_BAD_REQUEST) -> None:
        self.code = code
        self.message = message
        self.status_code = status_code


class UnsupportedAudioFormatError(AppError):
    def __init__(self, extension: str) -> None:
        super().__init__(
            code="unsupported_audio_format",
            message=f"Unsupported audio format: {extension}. Supported formats: wav, mp3, m4a, ogg.",
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
        )


class AudioTooLargeError(AppError):
    def __init__(self, max_size_mb: int) -> None:
        super().__init__(
            code="audio_file_too_large",
            message=f"Audio file is too large. Maximum allowed size is {max_size_mb} MB.",
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
        )


class ModelUnavailableError(AppError):
    def __init__(self, model_name: str) -> None:
        super().__init__(
            code="model_unavailable",
            message=f"{model_name} model is unavailable in current configuration.",
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        )


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": exc.code,
                    "message": exc.message,
                    "request_id": getattr(request.state, "request_id", None),
                }
            },
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "error": {
                    "code": "validation_error",
                    "message": "Request validation failed.",
                    "details": exc.errors(),
                    "request_id": getattr(request.state, "request_id", None),
                }
            },
        )

    @app.exception_handler(Exception)
    async def unexpected_error_handler(request: Request, exc: Exception) -> JSONResponse:
        request.app.state.logger.exception("unexpected_error", exc_info=exc)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": {
                    "code": "internal_error",
                    "message": "Internal server error.",
                    "request_id": getattr(request.state, "request_id", None),
                }
            },
        )

