from flask import Flask, render_template, url_for, request
import json
import boto3

ddb_client = boto3.client("dynamodb", "us-east-2")
s3_client = boto3.client("s3", "us-east-2")

app = Flask(__name__)

@app.route("/")
def main():
    return render_template("main.html",
        style_link=url_for("static", filename="style.css"),
        js_link=url_for("static", filename="main.js"),
        vue_link = url_for("static", filename="vue.js")
    )


if __name__ == "__main__":
    app.run()
