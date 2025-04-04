//
//  DashboardViewController.swift
//  FreeRide
//

import UIKit

class DashboardViewController: SettingsViewController {

    private let vehiclesID = "vehicle"
    private let mapID = "map"

    override func viewDidLoad() {
        leftNavigationStyle = .custom(#imageLiteral(resourceName: "round_menu_black_48pt"))
        leftNavigationAction = .toggleMenu

        title = "Dashboard"

        super.viewDidLoad()
    }

    override func initializeTableView() {
        super.initializeTableView()

        tableView.delegate = self
        
        let fleetEnabled = context.currentLocation?.fleetEnabled ?? false

        dataSource.items = fleetEnabled ? [SettingsItem(id: mapID, image: #imageLiteral(resourceName: "round_map_black_36pt"), title: "Drivers"),
                            SettingsItem(id: vehiclesID, image: #imageLiteral(resourceName: "round_airport_shuttle_black_20pt"), title: "Available Vehicles")] : [SettingsItem(id: mapID, image: #imageLiteral(resourceName: "round_map_black_36pt"), title: "Drivers")]
        dataSource.refresh()
        tableView.reloadData()
    }
}

extension DashboardViewController: UITableViewDelegate {

    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        let item = dataSource.value(at: indexPath)

        if !context.currentUser.hasActiveLocation {
            presentAlert("Location", message: "Active location not available.")
            return
        }

        switch item.id {
        case vehiclesID:
            let vc = VehiclesViewController()
            vc.configureForDashboard()
            navigationController?.pushViewController(vc, animated: true)
        case mapID:
            let vc = FleetMapViewController()
            navigationController?.pushViewController(vc, animated: true)
        default:
            break
        }
    }
    
}
