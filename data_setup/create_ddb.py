import boto3

client = boto3.client('dynamodb', region_name="us-east-1")

def create():
	response = client.create_table(
		AttributeDefinitions=[
			{
				'AttributeName':'_id',
				'AttributeType':'S'
			},
		],
		TableName="test_table",
		KeySchema=[
			{
				"AttributeName":"_id",
				'KeyType':"HASH"
			}
		],
		BillingMode="PAY_PER_REQUEST")

def delete():
	response = client.delete_table(TableName="test_table")

delete()