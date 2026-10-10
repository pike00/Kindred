from enum import StrEnum


class MediaCategory(StrEnum):
    BOOK = "book"
    MOVIE = "movie"
    MUSICIAN = "musician"
    OTHER = "other"
    PODCAST = "podcast"
    TV_SHOW = "tv_show"

    def __str__(self) -> str:
        return str(self.value)
