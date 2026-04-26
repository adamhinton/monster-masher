# Purpose

This is the Django backend for the Monster Masher project.

## Start the project

If running for the first time:

<!-- Note to self, make these instructions better before publishing project -->

Git checkout root folder of project, then:
cd backend (if in root folder)
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

python manage.py runserver

OR:
python manage.py collectstatic --noinput
gunicorn config.wsgi:application --bind 0.0.0.0:8000

Visit:
http://127.0.0.1:8000/

## Health endpoint check

In dev:
curl http://127.0.0.1:8000/health/

In prod:
curl https://monster-masher.onrender.com/health

## Hosting

API: Render
Storage: Supabase
