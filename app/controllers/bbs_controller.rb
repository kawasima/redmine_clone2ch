class BbsController < ApplicationController
  unloadable

  accept_api_auth :users

  def index
    @user = User.current
    @project = Project.find(params[:project_id])
  end

  def users
    project = Project.find(params[:project_id])
    @users = project.users

    respond_to do |format|
      format.html { render :template => 'bbs/users.html.erb', :layout => !reques.xhr }
      format.api { @users }
    end
  end
end
