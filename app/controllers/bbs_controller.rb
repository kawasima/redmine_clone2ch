class BbsController < ApplicationController
  unloadable

  def index
    @user = find_current_user
    @project = Project.find(params[:project_id])
  end

end
