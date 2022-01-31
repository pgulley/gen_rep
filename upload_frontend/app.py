from flask import Flask, render_template, url_for, request, session
import json
import boto3
import hashids
import time
import uuid
import random
import os

from flask_dynamodb_sessions import Session

STAGE = os.environ.get('STAGE')


ddb_client = boto3.client("dynamodb", "us-east-1")
s3_client = boto3.client("s3", "us-east-1")
settings = json.loads(open("settings.json", "r").read())

hasher = hashids.Hashids()

app = Flask(__name__)


app.config["SESSION_DYNAMODB_TABLE"] = settings["SessionDDB_Name"]
Session(app)

def flatten_ddb(item):
    return {k:i[list(i)[0]] for k,i in item.items()}

#@app.route("/")
def main():
    return render_template("main.html",
        group_id="ALL",
        stage = STAGE,
        style_link=url_for("static", filename="style.css"),
        js_link=url_for("static", filename="main.js"),
        vue_link = url_for("static", filename="vue.js"),
        modal_js = url_for("static", filename="jquery.quick-modal.min.js"),
        modal_css = url_for("static", filename="quick-modal.min.css")
    )

@app.route("/")
def groups():
    user = session.get("logged_in")
    print(url_for("static", filename="quick-modal.min.css"))
    return render_template("groupList.html",
        user_id = session.get("user_id"),
        user_share_preference = session.get("user_share_preference"),
        stage = STAGE,
        style_link=url_for("static", filename="style.css"),
        js_link=url_for("static", filename="groups.js"),
        vue_link = url_for("static", filename="vue.js"),
        modal_js = url_for("static", filename="jquery.quick-modal.min.js"),
        modal_css = url_for("static", filename="quick-modal.min.css")
    )


@app.route("/group/<group_id>")
def group_tasks(group_id):
    user = session.get("logged_in")
    return render_template("main.html",
        user_id = session.get("user_id"),
        user_share_preference = session.get("user_share_preference"),
        stage = STAGE,
        group_id=group_id,
        style_link=url_for("static", filename="style.css"),
        js_link=url_for("static", filename="main.js"),
        vue_link = url_for("static", filename="vue.js"),
        modal_js = url_for('static', filename="jquery.quick-modal.min.js"),
        modal_css = url_for('static', filename="quick-modal.min.css")
    ) 


@app.route("/author")
def author():
    return render_template("authoring.html",
        stage = STAGE,
        style_link=url_for("static", filename="style.css"),
        js_link=url_for("static", filename="authoring.js"),
        vue_link = url_for("static", filename="vue.js"),
        modal_js = url_for('static', filename="jquery.quick-modal.min.js"),
        modal_css = url_for('static', filename="quick-modal.min.css")
    )   

###Ajaxy data stuff

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


###USERS
@app.route("/login")
def login():
    #really, this should also check if a user with this email already exists. 
    #if so, just grab that id and preference. 
    #if not, create it. 
    email = request.args.get("email")
    share_default = request.args.get("sharing")
    search = ddb_client.query(
        TableName = settings["TaskDDB_Name"],
        IndexName = "user",
        Select = "ALL_ATTRIBUTES",
        KeyConditionExpression = "email = :email",
        ExpressionAttributeValues = {":email":{"S": email}}
    )
    if(len(search["Items"]) == 0):
        item={
            'entryType':{"S":"U"},
            "id":{"S":  hasher.encode(int(time.time()*10 + random.randint(0,100)))},
            "email":{"S":email},
            "user_share_preference":{"BOOL":share_default=="true"}
        }

        resp = ddb_client.put_item(
            TableName = settings["TaskDDB_Name"],
            Item = item
        )
        
        item = flatten_ddb(item)
        session["logged_in"] = True
        session["user_id"] = item["id"]
        session["user_email"] = item["email"]
        session["user_share_preference"] = item["user_share_preference"]
    else:
        item = flatten_ddb(search["Items"][0])
        print(item)
        session["logged_in"] = True
        session["user_id"] = item["id"]
        session["user_email"] = item["email"]
        session["user_share_preference"] = item["user_share_preference"]
    return {"status":"OK", "user_id":item["id"], 'user_share_preference':item["user_share_preference"]}

@app.route("/logout")
def logout():
    session["logged_in"] = None
    session["user_id"] = None
    session["user_email"] = None
    session["user_share_preference"] = None
    return {"status": "OK"}



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
    user_id = session.get('user_id')
    public = session.get("user_share_preference")
    location = request.args.get("location")
    task_id = request.args.get("task_id")
    item = {
        '_id':{"S": uuid.uuid1().hex},
        'user_id':{"S":user_id},
        'upload_location':{"S":location},
        'task_id':{"S":task_id},
        'public':{"BOOL":public},
        'timestamp':{"N":f'{time.time()}'},
    }
    ddb_client.put_item(
        TableName = settings["AudioDDB_Name"],
        Item = item
    )
    return {"Status":"OK"}


if __name__ == "__main__":
    app.run()
