"""Validation utilities."""
import re
from typing import Optional


def validate_language_code(code: str) -> bool:
    """Validate ISO 639-1 or ISO 639-2 language code."""
    # Basic pattern for language codes (2-3 letters, optionally with region)
    pattern = r"^[a-zA-Z]{2,3}(-[a-zA-Z]{2})?$"
    return bool(re.match(pattern, code))


def validate_hex_color(color: str) -> bool:
    """Validate hex color code."""
    pattern = r"^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$"
    return bool(re.match(pattern, color))


def sanitize_filename(filename: str) -> str:
    """Sanitize a filename by removing invalid characters."""
    # Remove invalid characters
    sanitized = re.sub(r'[<>:"/\\|?*]', "", filename)
    # Remove leading/trailing spaces and dots
    sanitized = sanitized.strip(" .")
    # Limit length
    if len(sanitized) > 255:
        name, ext = sanitized.rsplit(".", 1) if "." in sanitized else (sanitized, "")
        sanitized = name[:255 - len(ext) - 1] + "." + ext if ext else name[:255]
    return sanitized or "unnamed"


def get_file_extension(filename: str) -> Optional[str]:
    """Get file extension from filename."""
    if "." in filename:
        return filename.rsplit(".", 1)[-1].lower()
    return None


def is_allowed_file(filename: str, allowed_extensions: set) -> bool:
    """Check if file has an allowed extension."""
    ext = get_file_extension(filename)
    return ext in allowed_extensions if ext else False
