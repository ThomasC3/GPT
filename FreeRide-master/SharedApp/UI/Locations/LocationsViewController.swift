//
//  LocationsViewController.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/22/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import UIKit

extension Notification.Name {
    static let didUpdateCurrentLocation = Notification.Name("didUpdateCurrentLocation")
}

class LocationsViewController: TableViewController {

    private lazy var dataSource: LocationsDataSource = {
        let ds = LocationsDataSource()
        ds.delegate = self
        return ds
    }()

    var isEditingLocation = false

    override func viewDidLoad() {
        leftNavigationStyle = .custom(#imageLiteral(resourceName: "round_menu_black_48pt"))
        leftNavigationAction = .toggleMenu
        
        if context.currentLocation != nil {
            title = "Edit Location".localize()
            if isEditingLocation {
                leftNavigationStyle = .close
                leftNavigationAction = .dismiss(true)
            }
        } else {
            title = "Set Location".localize()
        }

        super.viewDidLoad()

        view.backgroundColor = Theme.Colors.backgroundGray
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)

        loadLocations()
    }

    override func initializeTableView() {
        super.initializeTableView()

        dataSource.registerCellIdentifiers(in: tableView)
        tableView.dataSource = dataSource
        tableView.delegate = self

        tableView.rowHeight = UITableView.automaticDimension
        tableView.estimatedRowHeight = 116
    }

    private func loadLocations() {
        var query = GetLocationsQuery()

        if let latitude = Defaults.userLatitude, let longitude = Defaults.userLongitude {
            query.latitude = latitude.rounded(toPlaces: 8)
            query.longitude = longitude.rounded(toPlaces: 8)
        }

        context.api.getLocations(query) { result in
            switch result {
            case .success(let response):
                self.dataSource.refresh(items: response)
                self.tableView.reloadData()
            case .failure(let error):
                self.presentAlert(for: error)
            }
        }
    }

    private func showServiceInformation(for location: LocationResponse) {
        let vc = ServiceInformationViewController()
        vc.location = location
        
        if navigationController != nil {
            navigationController?.pushViewController(vc, animated: true)
        } else {
            self.present(vc, animated: true)
        }
        
    }
}

extension LocationsViewController: LocationsTableViewCellDelegate {

    func didSelectInfoButton(in cell: LocationsTableViewCell) {
        guard let indexPath = tableView.indexPath(for: cell) else {
            return
        }

        let item = dataSource.value(at: indexPath)
        showServiceInformation(for: item)
    }
}

extension LocationsViewController: UITableViewDelegate {

    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        let item = dataSource.value(at: indexPath)

        #if RIDER

        let currentRide = context.dataStore.fetchCurrentRide()
        guard currentRide == nil || currentRide?.statusValue == 700 else {
            showServiceInformation(for: item)
            return
        }

        let isLocationUnset = context.currentLocation == nil

        context.dataStore.wipeLocation()

        let location = Location(context: context.dataStore.mainContext)
        location.update(with: item)
        context.dataStore.save()

        tableView.reloadData()

        Notification.post(.didUpdateCurrentLocation)
        
        if isEditingLocation || isLocationUnset {
            dismiss(animated: true)
        } else {
            tabBarController?.selectedIndex = 0
        }

        #elseif DRIVER

        showServiceInformation(for: item)

        #endif
    }
}
