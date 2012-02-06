ActionController::Routing::Routes.draw do |map|
  map.connect 'projects/:project_id/clone2ch/:action/', :controller => :bbs

  map.with_options :controller => 'bbs', :action => 'users' ,:conditions => {:method => :get} do |bbs|
    bbs.connect 'projects/:project_id/clone2ch/users.:format'
  end
end
