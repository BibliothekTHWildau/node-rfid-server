# node RFID server

A small nodejs/express implementation to interact with RFID readers from Feig such as MR102 POE via a RESTlike http connection or Websocket.

This work is based on https://github.com/joostkamphuisnl/feig-driver/blob/main/lib/reader.js but USB related code was removed to enact with IP readers only.

# Installation

npm install

# Run

## Server 

`node server/server.js`

There is also a systemd unit file in `service`

To enable and run from systemd:

```
sudo cp service/node_rfid.service /etc/systemd/system
sudo systemctl daemon-reload
sudo systemctl enable node_rfid.service
sudo systemctl start node_rfid.service
# sudo systemctl stop node_rfid.service
```

## Test html client 

go to `client` folder and run `npx http-server` to serve the index.html via local web server.

## Test script

node test.js

Some reader methods are used in this file.


# REST api

Documentation to the RESTlike api can be found in `docs/thunder-collection_RFID-REST.json`

## Reader 

`GET http://localhost:4001/info/`

`GET http://localhost:4001/info/{readerid}`

`PUT http://localhost:4001/rfOff/{readerid}` Reader Command 0x6A

`GET http://localhost:4001/getReaderInfo/{readerid}` Reader Command 0x66

`PUT http://localhost:4001/cpuReset/{readerid}` Reader Command 0x63 

`PUT http://localhost:4001/systemReset/{readerid}` Reader Command 0x64

## Tags

`GET http://localhost:4001/inventory/{readerid}` sends ISO HOST Command 0x01, returns a json including infos on detected tags

```json
[
  {
    "TR-TYPE": 3,
    "DSFID": "3e",
    "IDD": "e0040100153b945a",
    "UID": "e0040100153b945a"
  }
]
```

`GET http://localhost:4001/tags/{readerid}?keekOpen` returns complete tags (inventory + getSystemInformation on each tag + readMultipleBlocks on each tag), keeps connection open afterwards

`GET http://localhost:4001/tags/{readerid}?json&keepOpen` returns tags in ISO28560-3 JSON and keeps connection open

```json
{ 
  "TR-TYPE": 3,
  "DSFID": "3e",
  "IDD": "e00401501f453d8f",
  "UID": "e00401501f453d8f",
  "AFI": 7,
  "BLOCKSIZE": 4,
  "BLOCKS": 28,
  "IC-REF": "1",
  "MEM-SIZE": 112,
  "data": [ ... ] 
}
```

## Tag

`GET http://localhost:4001/tag/{readerid}/{uid}` returns complete tag (getSystemInformation + readMultipleBlocks )

`DELETE http://localhost:4001/tag/{readerid}/{uid}` deletes tag by writing 0x00 on each memory position. If request body is an json array with appropriate size it gets written to tag. 

`POST http://localhost:4001/tag/{readerid}/{uid}?`

payload can be tag with data array

```json 
{
  "UID":"e0040100153b945a",
  "data":[17,1,1,102,111,111,98,97,114,0,0,0,0,0,0,0,0,0,0,136,175,68,69,53,50,54,0,0,0,0,0,0,0,0,0],
  "AFI":7
  }
```

OR tag with data model

```json
{
  "UID":"e0040100153b945a",
  "model":
    {
      "basicBlock": {
        "contentParameter": 1,
        "partNumber": 1,
        "partsInItem": 1,
        "typeOfUsage": 1,      
        "primaryItemIdentifier": "foo",
        "ISIL": "DE-526"
      }
    },
  "AFI":7
}
```
OR model only

```json
{
      "basicBlock": {
        "contentParameter": 1,
        "partNumber": 1,
        "partsInItem": 1,
        "typeOfUsage": 1,      
        "primaryItemIdentifier": "foo",
        "ISIL": "DE-526"
      }
}
```

## AFI

`GET http://localhost:4001/afi/{readerid}/{uid}` returns getSystemInformation response including AFI value.

`PUT http://localhost:4001/afi/{readerid}/{uid}?/{afi}?`

Payload can be defined in path OR request body f.e.:

```json
{
  "afi":123, 
  "UID":"e0040100153b945a"
}
```

# Websocket

The server also opens a websocket to acces some reader functions. It is sometimes faster to use, f.e. when reading a big number of tags. Each tag will be responded when tag data is read.

Some websocket calls can be found in `client/websocket.js`



this is a work in progress

