from flask import Flask, render_template, url_for, request
import json
import boto3
import hashids
import time
import uuid
import random
import os

STAGE = os.environ.get('STAGE')

ddb_client = boto3.client("dynamodb", "us-east-1")
s3_client = boto3.client("s3", "us-east-1")
settings = json.loads(open("settings.json", "r").read())

hasher = hashids.Hashids()

app = Flask(__name__)

def flatten_ddb(item):
    return {k:i[list(i)[0]] for k,i in item.items()}

#@app.route("/")
def main():
    return render_template("main.html",
        group_id="ALL",
        stage = STAGE,
        style_link=url_for("static", filename="style.css"),
        js_link=url_for("static", filename="main.js"),
        vue_link = url_for("static", filename="vue.js")
    )

@app.route("/")
def groups():
    return render_template("groupList.html",
        stage = STAGE,
        style_link=url_for("static", filename="style.css"),
        js_link=url_for("static", filename="groups.js"),
        vue_link = url_for("static", filename="vue.js")
    )

@app.route("/author")
def author():
    return render_template("authoring.html",
        stage = STAGE,
        style_link=url_for("static", filename="style.css"),
        js_link=url_for("static", filename="authoring.js"),
        vue_link = url_for("static", filename="vue.js")
    )   


@app.route("/submitTask")
def submitTask():
    task_def = json.loads(request.args.get("task"))

    item = {
            'entryType':{"S":"T"},
            "id":{"S":  hasher.encode(int(time.time()*10 + random.randint(0,100)))},
            "description":{"S":task_def["description"]},
            "taskGroup":{"S":task_def["taskGroup"]},
            'title':{"S":task_def["title"]},
            'rec_time':{"N":str(task_def["rec_time"])}
    }
    resp = ddb_client.put_item(
        TableName = settings["TaskDDB_Name"],
        Item = item
    )
    print(resp)
    return {"Status":"OK"}


@app.route("/submitGroup")
def submitGroup():
    group_def = json.loads(request.args.get("group"))

    item = {
            'entryType':{"S":"G"},
            "id":{"S": hasher.encode(int(time.time()*10 + random.randint(0,100)))},
            "description":{"S":group_def["description"]},
            'title':{"S":group_def["title"]},
    }
    resp = ddb_client.put_item(
        TableName = settings["TaskDDB_Name"],
        Item = item
    )
    print(resp)
    return {"Status":"OK"}



@app.route("/all_tasks")
def all_ddb_tasks():
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

@app.route("/tasks")
def ddb_group_tasks():
    group_id = request.args.get("group_id")
    if(group_id == "ALL"):
        return all_ddb_tasks
    else:
        print("=#"*10)
        print(group_id)
        response = ddb_client.query(
            TableName = settings["TaskDDB_Name"],
            IndexName="taskGroup",        
            Select = "ALL_ATTRIBUTES",
            KeyConditionExpression = "taskGroup = :group",
            ExpressionAttributeValues = { ":group":{"S":group_id}}
        )
        items = response["Items"]
        items = [flatten_ddb(item) for item in items]
        return {"data":items}


@app.route("/all_groups")
def ddb_groups():
    response = ddb_client.query(
        TableName = settings["TaskDDB_Name"],
        IndexName="entryType",        
        Select = "ALL_ATTRIBUTES",
        KeyConditionExpression = "entryType = :type",
        ExpressionAttributeValues = {":type": {"S": "G"}}
    )
    items = response["Items"]
    items = [flatten_ddb(item) for item in items]
    return {"data":items}

@app.route("/group/<group_id>")
def group_tasks(group_id):
    return render_template("main.html",
        stage = STAGE,
        group_id=group_id,
        style_link=url_for("static", filename="style.css"),
        js_link=url_for("static", filename="main.js"),
        vue_link = url_for("static", filename="vue.js")
    ) 



###UPLOAD MECHANICS

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
