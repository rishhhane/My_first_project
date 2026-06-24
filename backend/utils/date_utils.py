from datetime import datetime, date

class DateUtils:

    @staticmethod
    def parse_date_string(date_str):
        """Safely parses standard ISO string sequences into explicit Python date objects."""
        try:
            if not date_str:
                return None
            return datetime.strptime(str(date_str).strip(), '%Y-%m-%d').date()
        except ValueError:
            return None

    @staticmethod
    def is_date_in_past(target_date):
        """Evaluates if a calendar tracking milestone is set behind the present window."""
        if not target_date:
            return True
        if isinstance(target_date, datetime):
            target_date = target_date.date()
        return target_date < date.today()

    @staticmethod
    def is_before_cancellation_cutoff(appointment_datetime, cutoff_hours=1):
        """
        Calculates time gap difference metrics to enforce cancellation boundaries.
        Returns False if the appointment window falls inside the protected hours margin.
        """
        if not appointment_datetime:
            return False
            
        # Ensure we are evaluating matching datetimes
        if isinstance(appointment_datetime, str):
            try:
                appointment_datetime = datetime.fromisoformat(appointment_datetime)
            except ValueError:
                return False
                
        time_delta = appointment_datetime - datetime.utcnow()
        hours_remaining = time_delta.total_seconds() / 3600
        
        return hours_remaining >= cutoff_hours