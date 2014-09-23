#Permissions Provisioning Apps
===============================

##Overview
The permissions provisioning <a href="/deploy/UserApp.txt">User app</a> allows users with limited permissions to search for projects and submit permission requests for selected projects.  

The permissions provisioning <a href="/deploy/AdminApp.txt">Admin app</a> serves 2 functions:
<br>(1) To build and store the project name tree for a user with limited permissions to search and select projects from.  
<br>(2) To view user requests for project permissions and delete them once the request has been fulfilled.  

####Example Workflow Scenario:
* Admin App is installed in the workspace on a dashboard for Rally administrators. 
* Administrators generate the project tree for the first time by clicking the "Refresh Projects" button.

![Screenshot](/images/admin-refresh-projects.png)

* The <b>User App</b> is installed and shared with a project in the workspace by an Administrator.
* 
* <b>New Rally user</b> is given limited access to the project where the User app.  

* <b>New Rally user</b> logs in to rally and searches for the projects that they need access to.  Users can search for a project by project name (includes any name in the project's path and will include hits on parent project names) or project owner first name, last name or email address.  Auto complete on whole words can help guide users search term choices.

![Screenshot](/images/user-search-by-project.png)
 
* <b>New Rally user</b> submits permission requests by selecting whether or not the user would like to be a team member and clicking the button for the desired project permission (Admin, Editor, Viewer)

![Screenshot](/images/user-permission-select.png)
 
* The user app will show <b>users</b> their pending permission requests, if they have not been cleared by an administrator.
 
 ![Screenshot](/images/user-pending-permission-requests.png)
 
* <b>Administrators</b> see the permission requests, including the Full project path, when they refresh the Admin App.  

![Screenshot](/images/admin-requested-permission.png)
 
* <b>Administrators</b> click on the link to the user to edit the user
* <b>Administrator</b> applies the appropriate permission
* <b>Administrator</b> removes the permission request from the Admin App once the permission request has been fulfilled.  

## Requirements
For users with limited permissions to use the User permissions provisioning app, the User needs, at minimum, Viewer permission for the project that the App is shared with in order to search the project name tree and submit permission requests.  

Users running the Admin app require workspace admin permission, at minimum, to build and store the project name tree and also to view and remove user permission requests.  


## Take Note
The project tree must be regenerated manually periodically to keep the project structure up to date.  The rate at which it should be regenerated depends on how often projects are added, deleted or modified in the workspace.  Both the User App and the Admin app will display timestamps that indicate the last time that the project tree was built.  

For workspaces with extremely large number of projects, it may take several minutes for the project tree to be saved the first time.  If the User App is spinning for several minutes during load, that may be an indication that the project tree has not completed saving yet. Try rebuilding the project tree (using the Admin App) and waiting several minutes (~5 per 2000 projects) before using the User application again.

The Admin app and User app should be installed in the same workspace.

Users with limited permissions should not have access to or try to use the Admin App. 

Searches for projects should be specific enough to limit results to a reasonable number, since there is not paging in the search results.  The project data is local so the search results are returned quickly, but the app will get sluggish if it needs to render more than 500-1000 search results at a time.  

## License
The permissions provisioning apps are released "as-is" under the MIT License.  Please see the <a href="/LICENSE">LICENSE</a> file for full text.  
