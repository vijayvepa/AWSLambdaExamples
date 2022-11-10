var async = require('async');
var aws = require('aws-sdk');
var gm = require('gm').subClass({imageMagick: true});
var util = require('util');

var DEFAULT_MAX_WIDTH = 200;
var DEFAULT_MAX_HEIGHT = 200;
var DDB_TABLE = 'images';

var s3 = new aws.S3();
var dynamodb = new aws.DynamoDB();

function getImageType(key, callback) {
	var typeMatch = key.match(/\.([^.]*)$/);

	if(!typeMatch){
		callback("Could not determine image type for key '" + key );
		return;
	}

	var imageType = typeMatch[1];
	if(imageType !=="jpg" && imageType !=="png"){
		callback("Unsupported image type '" + imageType );
		return;
	}

	return imageType;
}


exports.handler = function (event, context, callback) {

	console.log('Reading options from event: \n', util.inspect(event, {depth:5}));

	var srcBucket=  event.Records[0].s3.bucket.name;
	var srcKey=  event.Records[0].s3.object.key;
	var destBucket = srcBucket;
	var destKey = 'thumbs/' + srcKey;

	async.waterfall([
		function downloadImage(next){
			s3.getObject([{Bucket: srcBucket, Key: srcKey}], next);
		},
		function transformImage(response, next) {
			gm(response.Body).size(function(err, size) {
				var metadata = response.Metadata;
				console.log("Metadata: \n", util.inspect(metadata, {depth:5}));
				var max_width;
				
				if('width' in metadata){
					max_width = metadata.width;
				}else{
					max_width = DEFAULT_MAX_WIDTH;
				}
				
				var max_height;
				if('height' in metadata){
					max_height = metadata.height;
				}else{
					max_height = DEFAULT_MAX_HEIGHT;
				}

				var scalingFactor = Math.min(max_width/size.width, max_height/size.height);

				var width = scalingFactor * size.width;
				var height = scalingFactor * size.height;
				
				this.resize(width, height).toBuffer(imageType, function(err, buffer) {
					if(err) {
						next(err);
					}else{
						next(null, response.ContentType, metadata, buffer);
					}
				});
			});
		},
		function uploadThumbnail(contentType, metadata, data, next){
			s3.putObject(
				{
					Bucket: destBucket,
					Key: destKey,
					Body: data,
					ContentType: contentType,
					Metadata: metadata
				}, 
				function(err, buffer){
					if(err){
						next(err);
					}else{
						next(null, metadata);
					}
				}
			);
		},

		function storeMetadata(metadata, next){
			//add metadata to dynamodb
			var params = {
				TableName: DDB_TABLE,
				Item: {
					name: {S: srcKey},
					thumbnail: {S: dstKey},
					timestamp: {S: (new Date().toJSON()).toString()}
				}
			};

			if('author' in metadata){
				params.Item.author = {S: metadata.author};
			}

			if('title' in metadata){
				params.Item.title = {S: metadata.title};
			}
			
			if('description' in metadata){
				params.Item.description = {S: metadata.description};
			}
			
			dynamodb.putItem(params, next)
		}
	], function(err){
		if(err){
			console.error(err);
		}else{
			console.log('Successfully resized ' + srcBucket + '/' + srcKey + ' and uploaded to ' + destBucket + '/' + destKey);
		}

		callback();
	});

};
