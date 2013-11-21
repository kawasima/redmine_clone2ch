match 'projects/:project_id/clone2ch/(:action)', :controller => :bbs
get 'projects/:project_id/clone2ch/users.:format', :controller => 'bbs', :action => 'users'
