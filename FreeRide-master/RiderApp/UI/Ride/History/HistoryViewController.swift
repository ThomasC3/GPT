//
//  HistoryViewController.swift
//  Circuit
//
//  Created by Andrew Boryk on 11/28/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import UIKit

class HistoryViewController: TableViewController, UITableViewDelegate {

    private let dataSource = HistoryDataSource()

    override func viewDidLoad() {
        leftNavigationStyle = .custom(#imageLiteral(resourceName: "round_menu_black_48pt"))
        leftNavigationAction = .toggleMenu

        title = "menu_ride_history".localize()

        super.viewDidLoad()

        view.backgroundColor = Theme.Colors.backgroundGray
        tableView.reloadData()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)

        context.api.getRides { result in
            switch result {
            case .success(let response):
                self.dataSource.refresh(items: response)
                self.tableView.reloadData()
            case .failure(let error):
                self.presentAlert(for: error)
            }
        }
    }

    override func initializeTableView() {
        super.initializeTableView()

        dataSource.registerCellIdentifiers(in: tableView)
        tableView.dataSource = dataSource
        tableView.delegate = self

        tableView.rowHeight = UITableView.automaticDimension
        tableView.estimatedRowHeight = 240
        
        dataSource.location = context.dataStore.currentLocation()
    }
    
    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        let item = dataSource.value(at: indexPath)

        #if RIDER
        let vc = RatingViewController()
        let ride = Ride(context: self.context.dataStore.mainContext)
        ride.update(with: item)
        vc.setRide(ride: ride)
        navigationController?.pushViewController(vc, animated: true)
        #endif
    }
    
    
}
