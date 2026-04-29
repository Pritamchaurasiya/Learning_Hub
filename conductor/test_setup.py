import sys, os, traceback, threading, _thread

def timeout():
    print('Timed out!')
    _thread.interrupt_main()

timer = threading.Timer(5.0, timeout)
timer.start()

try:
    import django
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
    django.setup()
    print('Success')
except KeyboardInterrupt:
    print('Interrupted by timeout')
    traceback.print_exc()
except Exception as e:
    traceback.print_exc()
finally:
    timer.cancel()
