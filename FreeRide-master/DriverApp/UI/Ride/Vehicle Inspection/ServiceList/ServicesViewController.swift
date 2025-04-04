//
//  ServicesViewController.swift
//  FreeRide
//

import UIKit

extension Notification.Name {
    static let didSelectService = Notification.Name("didSelectService")
}

class ServicesViewController: TableViewController {
    
    private lazy var dataSource: ServicesDataSource = {
        let ds = ServicesDataSource()
        return ds
    }()
    
    var vehicleId : String?
    var serviceList : [ServiceResponse]?
    
    override func viewDidLoad() {
        
        leftNavigationStyle = .close
        leftNavigationAction = .dismiss(true)
        title = "Select a Service".localize()
        
        super.viewDidLoad()

        view.backgroundColor = Theme.Colors.backgroundGray
        
        self.dataSource.refresh(items: serviceList ?? [])
        self.tableView.reloadData()
        
        if let services = serviceList, services.isEmpty {
            self.presentAlert("No Services", message: "This vehicle has no services available.")
        }
    }
    
    override func initializeTableView() {
        super.initializeTableView()

        dataSource.registerCellIdentifiers(in: tableView)
        tableView.dataSource = dataSource
        tableView.delegate = self

        tableView.rowHeight = UITableView.automaticDimension
        tableView.estimatedRowHeight = 140
    }
    
}

extension ServicesViewController: UITableViewDelegate {

    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        let item = dataSource.value(at: indexPath)
        self.dismiss(animated: true, completion: {
            Notification.post(.didSelectService, value: ["vehicleId": self.vehicleId, "serviceKey": item.key])
        })
    }
}
