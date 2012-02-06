class BbsController < ApplicationController
  unloadable

  accept_key_auth :users

  def index
    @user = find_current_user
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
