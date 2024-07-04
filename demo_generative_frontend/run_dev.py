import app, shutil

#A convenience script, so that I can keep settings in one place while developing 

shutil.copy("../settings.json", "./settings.json")
print("Updated local settings")
app.app.run(debug=True)