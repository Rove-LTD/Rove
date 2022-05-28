# Rove
The APIs that simplify the development of apps integration to their user's health data on Strava, Garmin and Apple Health.

There are 5 APIs for developers to use as follows:

# signUpUser() - OPTION should this be incorporated into connectService()

This API will create a user with the ROVE service and return the ROVE User ID.  The ROVE User ID is then used with all future calls to identify the user whose health data is being connected, requested or deauthorized.

Calls to connect data, request data and deauthorize services MUST contain a valid userId and a valid developerId 

	Usage: https://us-central1-rove-26.cloudfunctions.net/signUpUser?devId={devId}&userData={userJasonMap}
	Authorization: TBD
	Response: {userId: String} status 200
	Possible errors: 	status xxxx – user already exists
				status xxxx – user data is incomplete or has errors
				status xxxx – developerId is incorrect or authorization not granted
				status xxxx – unknown communication error

# connectService()

This API will create a link between a user and their health data for the service selected in the call (eg, STRAVA, Garmin, Apple Health).  The API returns a link which is used by the developer to redirect the user to a web page asking the user to approve access of their health data to ROVE technologies.  This authorization will be used to store and forward this data to the requesting developer.

OPTION - If the user being connected does not exist the user will be created, replacing signUpUser() above. Therefore, it will be very important that the developer does not send through the wrong userId as a new user will be created if the wrong id is sent.

	Usage: https://us-central1-rove-26.cloudfunctions.net/connectService?devId={devId}&userId={userId}&service={String}
			userId = the users ROVE userId, this is the ID that was returned in the signUpUser API call. OPTION: could this be provided by the developer and they can choose any ID that is unique for them?
	Parameters: 	devId = the developers ROVE devId
			provider = “strava” or “garmin”, more will be added
	Authorization: TBD
	Response: redirect HTTPS address
	Possible errors: 	error xxxx – user is already connected to this service
    			OPTION: error xxxx – user does not exist for this developer

				error xxxx – the provider is badly formatted, missing or not supported
				error xxxx – unknown communication error
                error xxxx - user Authorisation failed
                error xxxx - Developer Id does not exist or is not authorized


# getUserHealthData()

This API retrieves the users’ health data from all of the services they subscribe to.  The data is deduplicated and standardized into the ROVE format.  The API can be provided with optional dates that will limit the response to measurements valid during those specific dates (inclusive).


	Usage:  https://us-central1-rove-26.cloudfunctions.net/getUserHealthData?devId={devId}&userId={userId}&datefrom={startDate}&dateto={endDate}

	Parameters: 	userId (ROVE userId received from the signUp API)
			devId (ROVE developerId given to the developer when they up with ROVE technologies)
			optional – dateFrom (UTC date as integer, milleseconds from epoch)
			optional – dateTo (UTC date as integer, milleseconds from epoch)
	Response:  	Array<HealthMeasures/Activities>
	Possible errors:	status 200 – success (response payload can be empty)
				status xxx – unknown communication error

# deAuthoriseUser()

This API deauthorizes the user from the provided service and deletes the health data associated with that service.

    Usage:  https://us-central1-rove-26.cloudfunctions.net/deAuthoriseUser?devId={devId}&userId={userId}&service={string}

    Parameters: userId (ROVE userId received from the signUp API)
            	devId (ROVE developerId given to the developer when they up with ROVE technologies)
            	service – string (“strava” or “garmin”)
    Response:  	serviceStatus (a JSON map of the current status - following the call - of each service) eg.{garminConnected: “true”, stravaConnected: “false”}
    Possible errors:	status 200 – success (response payload cannot be empty)
                	status xxx – unknown communication error

