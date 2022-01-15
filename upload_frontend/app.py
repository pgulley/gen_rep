from flask import Flask, render_template, url_for, request
import json
import boto3
import hashids
import time
import uuid

ddb_client = boto3.client("dynamodb", "us-east-1")
s3_client = boto3.client("s3", "us-east-1")
settings = json.loads(open("settings.json", "r").read())

app = Flask(__name__)


def flatten_ddb(item):
    return {k:i[list(i)[0]] for k,i in item.items()}

@app.route("/")
def main():
    return render_template("main.html",
        style_link=url_for("static", filename="style.css"),
        js_link=url_for("static", filename="main.js"),
        vue_link = url_for("static", filename="vue.js")
    )


@app.route("/tasks")
def ddb_tasks():
    response = ddb_client.query(
        TableName = settings["TaskDDB_Name"],
        IndexName="entryType",        
        Select = "ALL_ATTRIBUTES",
        KeyConditionExpression = "entryType = :type",
        ExpressionAttributeValues = {":type": {"S": "T"}}
    )
    items = response["Items"]
    items = [flatten_ddb(item) for item in items]

    return {"data":items}



@app.route("/get_s3_upload_url")
def get_s3_upload_url():
    task = request.args.get("task")
    hasher = hashids.Hashids()
    timehash = hasher.encode(int(time.time()*10))
    #For now, just upload a "task-hash.ogg" ie "1-kfjO1.ogg"
    full_key = f"{task}-{timehash}.wav"
    post_url = s3_client.generate_presigned_url("put_object",
            {"Bucket":settings["AudioS3_Name"], "Key":full_key, "ContentType":"audio/wav;codecs=0"})
    return {"uploadURL":post_url}


@app.route("/put_job_record_ddb")
def put_job_record_ddb():
    location = request.args.get("location")
    task_id = request.args.get("task_id")
    item = {
        '_id':{"S": uuid.uuid1().hex},
        'user_id':{"S":"test_id"},
        'upload_location':{"S":location},
        'task_id':{"S":task_id},
        'timestamp':{"N":f'{time.time()}'},
    }
    ddb_client.put_item(
        TableName = settings["AudioDDB_Name"],
        Item = item
    )
    return {"Status":"OK"}


if __name__ == "__main__":
    app.run()
