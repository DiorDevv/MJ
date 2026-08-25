class AppException(Exception):
    status_code = 500
    detail = "Serverda ichki xatolik yuz berdi"

    def __init__(self, detail: str | None = None) -> None:
        if detail is not None:
            self.detail = detail
        super().__init__(self.detail)


class UsernameAlreadyExistsError(AppException):
    status_code = 409
    detail = "Bu foydalanuvchi nomi allaqachon band"


class InvalidCredentialsError(AppException):
    status_code = 401
    detail = "Foydalanuvchi nomi yoki parol noto'g'ri"


class InvalidTokenError(AppException):
    status_code = 401
    detail = "Token yaroqsiz yoki muddati tugagan"


class UserNotFoundError(AppException):
    status_code = 404
    detail = "Foydalanuvchi topilmadi"


class TaskNotFoundError(AppException):
    status_code = 404
    detail = "Vazifa topilmadi"


class CategoryNotFoundError(AppException):
    status_code = 404
    detail = "Kategoriya topilmadi"


class InvalidSnoozeTimeError(AppException):
    status_code = 422
    detail = "Kechiktirish vaqti kelajakda bo'lishi kerak"


class RateLimitExceededError(AppException):
    status_code = 429
    detail = "Juda ko'p urinish. Birozdan keyin qayta urinib ko'ring."


class CannotSkipNonRecurringTaskError(AppException):
    status_code = 422
    detail = "Faqat takrorlanuvchi vazifalarni o'tkazib yuborish mumkin"


class VoiceNoteNotFoundError(AppException):
    status_code = 404
    detail = "Bu vazifada ovozli xabar yo'q"
