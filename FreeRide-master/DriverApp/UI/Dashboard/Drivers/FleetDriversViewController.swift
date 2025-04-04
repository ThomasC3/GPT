//
//  FleetDriversViewController.swift
//  FreeRide
//

import UIKit

class FleetDriversViewController: TableViewController {
 
    private lazy var dataSource: DriversDataSource = {
        let ds = DriversDataSource()
        return ds
    }()
    
    private var drivers: [DriverResponse]?
    
    override func viewDidLoad() {
        super.viewDidLoad()
        leftNavigationStyle = .close
        leftNavigationAction = .dismiss(true)
        
        title = "Offline Drivers"
        view.backgroundColor = Theme.Colors.backgroundGray
    
        getDrivers()
    }
    
    func getDrivers() {
        ProgressHUD.show()
        context.api.getLoggedOutDrivers() { result in
            switch result {
            case .success(let response):
                self.dataSource.refresh(items: response.items)
                self.tableView.reloadData()
                if response.items.isEmpty {
                    self.presentAlert("No Drivers", message: "We could not get any driver that had recently logged out")
                }
            case .failure(let error):
                self.presentAlert(for: error)
            }
            ProgressHUD.dismiss()
        }
    }
    
    override func initializeTableView() {
        super.initializeTableView()

        dataSource.registerCellIdentifiers(in: tableView)
        tableView.dataSource = dataSource

        tableView.rowHeight = UITableView.automaticDimension
        tableView.estimatedRowHeight = 80
    }
}
