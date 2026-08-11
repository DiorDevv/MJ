from aiogram.fsm.state import State, StatesGroup


class TaskCreateStates(StatesGroup):
    title = State()
    due_date = State()
    due_time = State()
    category = State()
    priority = State()
    confirm = State()
