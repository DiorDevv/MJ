from aiogram.fsm.state import State, StatesGroup


class VoiceQuickAddStates(StatesGroup):
    awaiting_date_choice = State()
    awaiting_custom_date = State()
