"""
Emotional Assistance and Safety Service
Provides emotional awareness, empathetic framing, healthy coping suggestions,
and critical crisis/self-harm safety intervention.
"""

import re
import logging
from typing import Tuple, Optional

logger = logging.getLogger("uvicorn.error")

# Immediate danger / self-harm triggers that require safety intervention
CRISIS_TRIGGERS = [
    r"\bkill (myself|me)\b",
    r"\bend my life\b",
    r"\bsuicid(e|al)\b",
    r"\bwant to die\b",
    r"\bhurt myself\b",
    r"\bharm myself\b",
    r"\bcutting myself\b",
    r"\boverdose\b",
    r"\bdon'?t want to live\b",
    r"\bbetter off dead\b"
]

# Emotional distress cues
DISTRESS_TRIGGERS = [
    r"\bsad\b", r"\bdepressed\b", r"\banxious\b", r"\banxiety\b", r"\blonely\b",
    r"\bheartbroken\b", r"\bbreakup\b", r"\bcrying\b", r"\bpanic\b", r"\bhopeless\b",
    r"\boverwhelmed\b", r"\bexhausted\b", r"\bburnout\b", r"\bstressed\b",
    r"\bfailure\b", r"\bunhappy\b", r"\bgrief\b", r"\bhate myself\b"
]

CRISIS_SAFETY_RESPONSE = (
    "💙 **I hear how much pain you're in, and I care about your safety.**\n\n"
    "Please know that you do not have to carry this alone. There are compassionate people "
    "available right now who want to listen and support you without judgment:\n\n"
    "- **National Suicide & Crisis Lifeline**: Call or text **988** (Available 24/7 in US & Canada)\n"
    "- **Crisis Text Line**: Text **HOME** to **741741**\n"
    "- **UK Emergency / Crisis**: Call **111** or **999**\n"
    "- **India Helpline**: Call **KIRAN** at **1800-599-0019** or **Tele-MANAS** at **14416**\n"
    "- **International Resources**: Find your local hotline at [Befrienders Worldwide](https://www.befrienders.org/)\n\n"
    "Please reach out to a trusted family member, close friend, or healthcare professional right away."
)


class EmotionService:
    def check_crisis(self, text: str) -> Tuple[bool, Optional[str]]:
        """
        Scans text for immediate safety or self-harm risks.
        Returns (is_crisis, safety_message).
        """
        lower = text.lower()
        for trigger in CRISIS_TRIGGERS:
            if re.search(trigger, lower):
                logger.warning(f"Crisis keyword detected in prompt: '{trigger}'")
                return True, CRISIS_SAFETY_RESPONSE
        return False, None

    def is_emotional_query(self, text: str) -> bool:
        """
        Determines if the user's message contains personal emotional distress or vulnerability.
        """
        lower = text.lower()
        for trigger in DISTRESS_TRIGGERS:
            if re.search(trigger, lower):
                return True
        return False

    def get_empathy_system_prompt(self) -> str:
        """
        Returns empathetic guidance prompt for the LLM.
        """
        return (
            "The user is experiencing emotional distress or seeking personal support. "
            "Please respond with genuine warmth, active listening, and empathy. "
            "Validate their emotions without judgment, suggest practical healthy coping strategies "
            "(e.g., deep breathing, grounding exercises, taking a short walk, drinking water, journaling), "
            "and ask a gentle follow-up question to help them reflect. "
            "Remember: You are an empathetic AI companion, not a licensed medical therapist or doctor. "
            "Do not diagnose conditions or give medical prescriptions."
        )


emotion_service = EmotionService()
