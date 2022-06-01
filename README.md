# Rove
The Rove microservice simplifies the development of apps that need to integrate to their user's health data on Strava, Garmin and PolarFlow.

The service is exposed through 2 APIs for developers to use as follows:

# connectService()

This API will create a link between a user and their fitness data for the service selected in the call (eg, STRAVA, Garmin, PolarFlow).  The API returns a link which is used to redirect the user to a web page asking.  There the user is asked to approve access for their fitness data to the developer's company.  The developer also supplies a destination for the users fitness data.  

The user authorization is used by Rove's microservice to forward the users fitness data to the destination the developer has specified.  This must be a WebHook and more destination types may be added as needed in the future.

	Usage: https://us-central1-rove-26.cloudfunctions.net/connectService?devId={devId}&userId={userId}&service={String}
			userId = the userId provided by the developer.  This must be unique within the developers context.
	Parameters: 	devId = the developers ROVE devId supplied to the developer when they sign-up to the Rove microservice
			provider = “strava”, “garmin”, "polarFlow' more will be added where there is demand
            destination = url of the WebHook where the users fitness data will be forwarded by Rove for processing by the developer
	Authorization: devKey = the developers secret key added to the parameters
	Response: redirect HTTPS address
	Possible errors: 	
				error xxxx – the provider is badly formatted, missing or not supported
                error xxxx - the developerId is badly formatted, missing or not Authorised
                error xxxx - the userId is parameter is missing
				error xxxx – unknown communication error


# getUserHealthData() - Under discussion

This API retrieves the users’ health data from all of the services they subscribe to.  The data is deduplicated and standardized into the ROVE format.  The API can be provided with optional dates that will limit the response to measurements valid during those specific dates (inclusive).


	Usage:  https://us-central1-rove-26.cloudfunctions.net/getUserHealthData?devId={devId}&userId={userId}&datefrom={startDate}&dateto={endDate}

	Parameters: 	userId (ROVE userId received from the signUp API)
			devId (ROVE developerId given to the developer when they up with ROVE technologies)
			optional – dateFrom (UTC date as integer, milleseconds from epoch)
			optional – dateTo (UTC date as integer, milleseconds from epoch)
	Response:  	Array<HealthMeasures/Activities>
	Possible errors:
				error xxx – unknown communication error

# deAuthoriseUser()

This API deauthorizes the user from the provided service and deletes any fitness or configuration data associated with the service for that user. It returns the status of the user's connection to all the available service following the deAuthorisation

    Usage:  https://us-central1-rove-26.cloudfunctions.net/deAuthoriseUser?devId={devId}&userId={userId}&service={string}

    Parameters: userId = the developers unique userId for this user
            	devId (ROVE developerId given to the developer when they up with ROVE technologies)
            	service – string (“strava”, “garmin”, "polarFlow")
    Authorisation: devKey = the developers secret key added to the parameters
    Response:  	serviceStatus (a JSON map of the current status - following the call - of each service) eg.{garminConnected: “true”, stravaConnected: “false”}
    Possible errors:
                error xxxx - userId does not exist or missing
                error xxxx - devId missing, or not authorized
                error xxxx – unknown communication error

