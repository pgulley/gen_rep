from flask import Flask, render_template, url_for, request
import json
import boto3
import os

STAGE = os.environ.get('STAGE')

ddb_client = boto3.client("dynamodb", "us-east-1")
s3_client = boto3.client("s3", "us-east-1")
settings = json.loads(open("settings.json", "r").read())

app = Flask(__name__)


def flatten_ddb(item):
    return {k:i[list(i)[0]] for k,i in item.items()}

@app.route("/")
def main():
	return render_template("main.html",
		stage=STAGE,
		style_link=url_for("static", filename="style.css"),
		js_link=url_for("static", filename="main.js"),
        pbjs_link = url_for("static", filename="progressbar.js")
		)


@app.route("/all_tasks", methods=['GET', 'POST'])
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
    items = sorted(items, key=lambda x: x["groupOrder"])
    return {"data":items}


@app.route("/group_tasks",methods=['GET', 'POST'])
def ddb_group_tasks():
    group_id = request.args.get("group_id")
    response = ddb_client.query(
        TableName = settings["TaskDDB_Name"],
        IndexName="taskGroup",        
        Select = "ALL_ATTRIBUTES",
        KeyConditionExpression = "taskGroup = :group",
        ExpressionAttributeValues = { ":group":{"S":group_id}}
    )
    items = response["Items"]
    items = [flatten_ddb(item) for item in items]

    return {"data":items, "group_id":group_id}

@app.route("/get_task_audio",methods=['GET', 'POST'])
def get_task_audio():
	task_id = request.args.get("task_id")
	response = ddb_client.query(
		TableName=settings["AudioDDB_Name"],
		IndexName="task_id",
		Select="ALL_ATTRIBUTES",
		KeyConditionExpression="task_id = :id and is_public = :pub",
		ExpressionAttributeValues = {":id": {"S":task_id}, ":pub":{"S":str(True)}}
		)
	items = response["Items"]
	items = [flatten_ddb(item) for item in items]
	return {"data":items}


@app.route("/get_signed_s3_url", methods=['GET', 'POST'])
def get_s3_download_url():
	rec_id = request.args.get("rec_id")
	rec = ddb_client.get_item(
		TableName = settings["AudioDDB_Name"],
		Key = {"_id":{"S":rec_id}})["Item"]

	key = rec['upload_location']['S'].split("/")[-1]

	get_url = s3_client.generate_presigned_url("get_object",{
		"Bucket":settings["AudioS3_Name"],
		"Key":key
	})
	return {"rec_id":rec_id, "get_url":get_url}