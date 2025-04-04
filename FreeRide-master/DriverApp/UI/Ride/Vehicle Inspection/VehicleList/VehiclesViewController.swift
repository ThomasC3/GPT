//
//  VehiclesViewController.swift
//  FreeRide
//

import UIKit

extension Notification.Name {
    static let didSelectVehicle = Notification.Name("didSelectVehicle")
}

class VehiclesViewController: TableViewController {
    
    private lazy var dataSource: VehiclesDataSource = {
        let ds = VehiclesDataSource()
        return ds
    }()
    
    private var onDashboard = false
    
    override func viewDidLoad() {
        
        if onDashboard {
            leftNavigationAction = .pop(true)
            leftNavigationStyle = .back
            title = "Available Vehicles".localize()
        } else {
            leftNavigationStyle = .close
            leftNavigationAction = .dismiss(true)
            title = "Select a Vehicle".localize()
        }
        
        super.viewDidLoad()

        view.backgroundColor = Theme.Colors.backgroundGray
        
        getVehicles()
    }
    
    func configureForDashboard() {
        onDashboard = true
    }
    
    func getVehicles() {
        
        guard let location = context.dataStore.currentLocation() else {
            return
        }
        
        ProgressHUD.show()
        let query = GetVehiclesQuery(location: location.id)
        context.api.getVehicles(query: query) { result in
            switch result {
            case .success(let response):
                self.dataSource.refresh(items: response)
                self.tableView.reloadData()
                if response.isEmpty {
                    self.presentAlert("No Vehicles", message: "There are no vehicles available to check out.")
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
        tableView.delegate = self

        tableView.rowHeight = UITableView.automaticDimension
        tableView.estimatedRowHeight = 230
    }
}

extension VehiclesViewController: UITableViewDelegate {

    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        if !onDashboard {
            let item = dataSource.value(at: indexPath)
            self.dismiss(animated: true, completion: {
                Notification.post(.didSelectVehicle, value: item)
            })
        }
    }
}

