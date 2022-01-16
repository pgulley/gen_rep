import boto3
import json
import uuid


client = boto3.client('dynamodb', region_name="us-east-1")
settings = json.loads(open("../settings.json", "r").read())

def create_audio_table():
	response = client.create_table(
		AttributeDefinitions=[
			{
				'AttributeName':'_id',
				'AttributeType':'S'
			},
		],
		TableName=settings["AudioDDB_Name"],
		KeySchema=[
			{
				"AttributeName":"_id",
				'KeyType':"HASH"
			}
		],
		BillingMode="PAY_PER_REQUEST")
	print(response)


def create_tasks_table():
	response = client.create_table(
		AttributeDefinitions=[
			{
				'AttributeName':'id',
				'AttributeType':'S'
			},
			{	'AttributeName':'entryType',
				'AttributeType':'S',
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
				
			}
		],
		BillingMode="PAY_PER_REQUEST")
	print(response)


def delete_audio_table():
	response = client.delete_table(TableName=settings["AudioDDB_Name"])
	print(response)

def delete_task_table():
	response = client.delete_table(TableName=settings["TaskDDB_Name"])
	print(response)


def populate_default_tasks():
	local_tasks = json.loads(open("default_tasks.json", "r").read())
	print(local_tasks)
	for task in local_tasks:

		item = {
			'entryType':{"S":"T"},
			"id":{"S":  uuid.uuid1().hex},
			"description":{"S":task["description"]},
			'title':{"S":task["title"]},
			'rec_time':{"N":str(task["rec_time"])}
		}
		resp = client.put_item(
		    TableName = settings["TaskDDB_Name"],
		    Item = item
		)
		print(resp)


#delete_task_table()
#create_tasks_table()
populate_default_tasks()