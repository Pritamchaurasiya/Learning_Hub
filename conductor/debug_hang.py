import faulthandler
import threading
import time
import sys
import os

faulthandler.enable()

def dump():
    time.sleep(5)
    faulthandler.dump_traceback()
    os._exit(1)

threading.Thread(target=dump, daemon=True).start()

os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings.test'
import django
django.setup()
print('Success')
