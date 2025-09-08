"""
Main WSGI application module for gunicorn.
This file imports the Django WSGI application to make it compatible
with the current workflow configuration.
"""

from eventgo.wsgi import application

# Make the WSGI application available as 'app' for gunicorn
app = application