# gunicorn_config.py
from gunicorn.glogging import Logger


class HealthCheckFilter(Logger):
    def access(self, resp, req, environ, request_time):
        if environ.get("PATH_INFO") == "/health":
            return
        super().access(resp, req, environ, request_time)


logger_class = HealthCheckFilter
