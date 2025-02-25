# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)





## Amplify deployment instruction by LLM
# AWS Amplify Deployment Guide

This guide explains how to deploy the chat application using AWS Amplify and AWS Lambda.

## Frontend Deployment with AWS Amplify

1. **Connect your repository to AWS Amplify**:
   - Log in to the AWS Management Console
   - Navigate to AWS Amplify
   - Click "Create app" > "Host web app"
   - Choose your Git provider and connect your repository
   - Select the branch to deploy

2. **Configure build settings**:
   - Amplify will auto-detect React settings, but verify the build settings:

   ```yaml
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
           - npm install
       build:
         commands:
           - npm run build
     artifacts:
       baseDirectory: build
       files:
         - '**/*'
     cache:
       paths:
         - node_modules/**/*
   ```

3. **Set environment variables**:
   - Go to App settings > Environment variables
   - Add `REACT_APP_API_URL` pointing to your API Gateway URL (after backend deployment)

## Backend Deployment to AWS Lambda

1. **Create the Lambda function**:
   - Navigate to AWS Lambda
   - Create a new function
   - Choose Python 3.9+ as the runtime
   - Create a new role with basic Lambda permissions

2. **Deploy the code**:
   - Package the code:
     ```
     pip install -r requirements.txt --target ./package
     cp main.py ./package/
     cd package
     zip -r ../deployment-package.zip .
     ```
   - Upload the deployment package to Lambda

3. **Add required permissions to Lambda role**:
   - Add SSM parameter read permissions to access the API key

4. **Configure API Gateway**:
   - Create a new API Gateway (HTTP API)
   - Add routes:
     - POST /api/chat -> Your Lambda function
     - GET /api/health -> Your Lambda function
   - Enable CORS for your Amplify domain

5. **Store secrets**:
   - In AWS Systems Manager Parameter Store:
     - Create a secure string parameter `/chatbot/OPENAI_API_KEY` with your OpenAI API key

## Required Dependencies

**Backend (add to requirements.txt)**:
```
fastapi==0.110.0
uvicorn==0.28.0
langchain==0.1.14
langchain-openai==0.0.8
python-dotenv==1.0.1
pydantic==2.6.1
mangum==0.17.0
boto3==1.34.21
```

**Special backend package for AWS Lambda**:
- Mangum: Adapter for running ASGI applications like FastAPI in AWS Lambda

## Monitoring and Debugging

1. **Check CloudWatch Logs**:
   - Lambda logs will be in CloudWatch
   - Enable detailed logging by setting appropriate log levels

2. **Set up CloudWatch Alarms**:
   - Monitor Lambda errors and latency
   - Create alarms for when error rates exceed thresholds

## Further Optimizations

1. **Add CloudFront CDN**:
   - Automatically configured with Amplify

2. **Consider Cognito Authentication**:
   - Add user authentication if needed
   - Update CORS settings accordingly

3. **Optimize Lambda Cold Starts**:
   - Use Provisioned Concurrency for the Lambda function
   - Minimize dependencies in the deployment package