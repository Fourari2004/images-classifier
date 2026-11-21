@echo off
echo Creation de l'environnement virtuel...
python -m venv venv

echo Activation de l'environnement virtuel...
call venv\Scripts\activate.bat

echo Installation des dependances...
pip install -r requirements.txt

echo Lancement du projet...
python run.py

pause
