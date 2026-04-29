import os
import sys
import threading
import _thread

def timeout():
    print('TIMEOUT REACHED! Dumping threads:')
    import traceback
    for th in threading.enumerate():
        print(th)
        traceback.print_stack(sys._current_frames()[th.ident])
    _thread.interrupt_main()

timer = threading.Timer(10.0, timeout)
timer.start()

try:
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
    import django
    django.setup()
    
    from django.core.management import call_command
    print('Calling makemigrations...')
    call_command('makemigrations')
    print('Done!')
except KeyboardInterrupt:
    print('Interrupted by timeout')
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    timer.cancel()
