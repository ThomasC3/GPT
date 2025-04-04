//
//  SettingsViewController.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/30/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import UIKit

class SettingsViewController: TableViewController {

    let dataSource = SettingsDataSource()

    override func viewDidLoad() {
        super.viewDidLoad()

        view.backgroundColor = Theme.Colors.backgroundGray
    }

    override func initializeTableView() {
        super.initializeTableView()

        dataSource.registerCellIdentifiers(in: tableView)
        tableView.dataSource = dataSource

        tableView.rowHeight = 80
    }
}
