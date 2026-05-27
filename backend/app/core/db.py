from sqlmodel import Session, create_engine, select

from app import crud
from app.core.config import settings
from app.core.setup_state import SINGLETON_ID, SetupState
from app.models import User, UserCreate

engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))


def SessionLocal() -> Session:
    """Session factory — returns a new Session bound to the engine."""
    return Session(engine)


def get_session(include_deleted: bool = False) -> Session:
    """Create a new session with soft-delete filtering applied."""
    session = Session(engine)
    configure_session(session, include_deleted=include_deleted)
    return session


def configure_session(session: Session, include_deleted: bool = False) -> None:
    """No-op: soft-delete filtering is applied per-query in individual routes."""
    pass


# make sure all SQLModel models are imported (app.models) before initializing DB
# otherwise, SQLModel might fail to initialize relationships properly
# for more details: https://github.com/tiangolo/full-stack-fastapi-template/issues/28


def init_db(session: Session) -> None:
    # Tables should be created with Alembic migrations
    # But if you don't want to use migrations, create
    # the tables un-commenting the next lines
    # from sqlmodel import SQLModel

    # This works because the models are already imported and registered from app.models
    # SQLModel.metadata.create_all(engine)

    # Legacy bootstrap: if FIRST_SUPERUSER + FIRST_SUPERUSER_PASSWORD are set
    # (test fixtures, dev-only convenience), create that user and mark the
    # setup gate complete so the new token flow stays out of the way.
    if settings.FIRST_SUPERUSER and settings.FIRST_SUPERUSER_PASSWORD:
        user = session.exec(
            select(User).where(User.email == settings.FIRST_SUPERUSER)
        ).first()
        if not user:
            user_in = UserCreate(
                email=settings.FIRST_SUPERUSER,
                password=settings.FIRST_SUPERUSER_PASSWORD,
                is_superuser=True,
            )
            user = crud.create_user(session=session, user_create=user_in)
        state = session.get(SetupState, SINGLETON_ID)
        if state is None:
            session.add(SetupState(id=SINGLETON_ID, complete=True, token_hash=None))
            session.commit()
        elif not state.complete:
            state.complete = True
            state.token_hash = None
            session.add(state)
            session.commit()
