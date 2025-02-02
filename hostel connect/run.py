from backend import create_app
import os
from flask import send_from_directory

app = create_app()

# Ensure all static asset routes are handled
@app.route('/assets/<path:filename>')
def serve_assets(filename):
    return send_from_directory(os.path.join(app.root_path, '../frontend/assets'), filename)

if __name__ == '__main__':
    app.run(debug=True, port=5000)