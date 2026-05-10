from enum import Enum


class MediaCategory(str, Enum):
    BOOK = "book"
    MOVIE = "movie"
    MUSICIAN = "musician"
    OTHER = "other"
    PODCAST = "podcast"
    TV_SHOW = "tv_show"

    def __str__(self) -> str:
        return str(self.value)
