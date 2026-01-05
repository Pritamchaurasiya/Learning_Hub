@echo off
echo Running Black...
python -m black .
echo.
echo Running Flake8...
python -m flake8 .
echo.
echo Running Mypy...
python -m mypy .
echo.
echo Running Bandit...
python -m bandit -r . -x ./venv

echo.
echo Quality checks complete.
