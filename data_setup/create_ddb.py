import boto3
import json
import uuid
import hashids
import time
import argparse
import random

client = boto3.client('dynamodb', region_name="us-east-1")
settings = json.loads(open("../settings.json", "r").read())

def create_audio_table(**kwargs):
	response = client.create_table(
		AttributeDefinitions=[
			{
				'AttributeName':'_id',
				'AttributeType':'S'
			},
			{
				'AttributeName':'task_id',
				'AttributeType':'S'
			},{
				"AttributeName":"is_public",
				"AttributeType":"S"
			},{
				"AttributeName":"user_id",
				"AttributeType":'S'
			}
		],
		TableName=settings["AudioDDB_Name"],
		KeySchema=[
			{
				"AttributeName":"_id",
				'KeyType':"HASH"
			}
		],
		BillingMode="PAY_PER_REQUEST",
		GlobalSecondaryIndexes=[
			{
				'IndexName':"task_id",
				'KeySchema':[{
					"AttributeName":"task_id",
					"KeyType":"HASH"
				},{
					"AttributeName":"is_public",
					'KeyType':"RANGE"
				}],
				"Projection":{
					"ProjectionType":"ALL"
				}

			},
			{
				"IndexName":"user_id",
				'KeySchema':[{
					"AttributeName":"user_id",
					"KeyType":"HASH"
				}],
				"Projection":{
					"ProjectionType":"ALL"
				}
			}]
		)
	print(response)


def create_tasks_table(**kwargs):
	response = client.create_table(
		AttributeDefinitions=[
			{
				'AttributeName':'id',
				'AttributeType':'S'
			},
			{	'AttributeName':'entryType',
				'AttributeType':'S',
			},
			{
				'AttributeName':'taskGroup',
				'AttributeType':'S'
			},
			{
				'AttributeName':"email",
				"AttributeType":"S"
			}
		],
		TableName=settings["TaskDDB_Name"],
		KeySchema=[
			{
				"AttributeName":"id",
				'KeyType':"HASH"
			}
		],
		GlobalSecondaryIndexes=[
			{
				'IndexName':"entryType",
				'KeySchema':[{
					"AttributeName":"entryType",
					"KeyType":"HASH"
				}],
				"Projection":{
					"ProjectionType":"ALL",

				}
				
			},
			{
				'IndexName':"user",
				'KeySchema':[{
					"AttributeName":"email",
					"KeyType":"HASH"
				}],
				"Projection":{
					"ProjectionType":"ALL",

				}
			},
			{
				'IndexName':"taskGroup",
				'KeySchema':[{
					"AttributeName":"taskGroup",
					"KeyType":"HASH"
				}],
				"Projection":{
					"ProjectionType":"ALL",

				}
				
			},

		],
		BillingMode="PAY_PER_REQUEST")
	print(response)


def create_session_table(**kwargs):
	response = client.create_table(
		AttributeDefinitions = [{
			"AttributeName":"id",
			"AttributeType":"S"
		}],
		KeySchema = [{
		"AttributeName":'id',
		"KeyType": "HASH"}],
		BillingMode="PAY_PER_REQUEST",
		TableName=settings["SessionDDB_Name"]
	)

def delete_session_table(**kwargs):
	response = client.delete_table(TableName=settings["SessionDDB_Name"])
	print(response)

def delete_audio_table(**kwargs):
	response = client.delete_table(TableName=settings["AudioDDB_Name"])
	print(response)

def delete_task_table(**kwargs):
	response = client.delete_table(TableName=settings["TaskDDB_Name"])
	print(response)


def populate_default_tasks(upl = "default"):
	if(upl == "default"):
		default_tasks = json.loads(open("default_tasks.json", "r").read())
	else:
		default_tasks = json.loads(open(upl, "r").read())
	print(default_tasks)
	hasher = hashids.Hashids()
	for group in default_tasks:

		if("id" in group.keys()):
			grouphash = group["id"]
		else:
			grouphash = hasher.encode(int(time.time()*10 + random.randint(0,100)))

		item = {
			'entryType':{"S":"G"},
			"id":{"S":  grouphash},
			"description":{"S":group["description"]},
			'title':{"S":group["title"]},
			
		}
		resp = client.put_item(
		    TableName = settings["TaskDDB_Name"],
		    Item = item
		)
		for task in group["tasks"]:
			if("id" in task.keys()):
				taskhash = task["id"]
			else:
				taskhash = hasher.encode(int(time.time()*10 + random.randint(0,100)))

			item = {
				'entryType':{"S":"T"},
				"taskGroup":{"S":grouphash},
				"order":{"N":str(task["order"])},
				"id":{"S": taskhash },
				"description":{"S":task["description"]},
				'title':{"S":task["title"]},
				'rec_time':{"N":str(task["rec_time"])}
			}
			resp = client.put_item(
			    TableName = settings["TaskDDB_Name"],
			    Item = item
			)

jobs = {
	"delete-audio":delete_audio_table,
	"create-audio":create_audio_table,
	"delete-task":delete_task_table,
	"create-task":create_tasks_table,
	"populate-task":populate_default_tasks,
	"create-session":create_session_table,
}		

parser = argparse.ArgumentParser(description="genrep database utilities")
parser.add_argument("-j", choices = list(jobs.keys()), help="Which task to run")
parser.add_argument("-e", help="contextual information", required=False)

if __name__ == "__main__":
	args = parser.parse_args()
	if(args.e is not None):
		jobs[args.j](args.e)
	else:
	
		jobs[args.j]()

