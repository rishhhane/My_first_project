"""
utils/id_generator.py
------------------------
This file was referenced nowhere directly in your uploaded doc, but is
REQUIRED because models now use string PKs (PA****, D****, AD****)
instead of auto-increment integers. Without this, auth_service.py
has no way to generate new IDs at registration time.
"""

import random
import string
from models.patient import Patient
from models.doctor import Doctor
from models.admin import Admin


def _random_suffix(length=4):
    chars = string.ascii_uppercase + string.digits
    return "".join(random.choices(chars, k=length))


def generate_patient_id():
    while True:
        new_id = "PA" + _random_suffix()
        if not Patient.query.get(new_id):
            return new_id


def generate_doctor_id():
    while True:
        new_id = "D" + _random_suffix()
        if not Doctor.query.get(new_id):
            return new_id


def generate_admin_id():
    while True:
        new_id = "AD" + _random_suffix()
        if not Admin.query.get(new_id):
            return new_id
