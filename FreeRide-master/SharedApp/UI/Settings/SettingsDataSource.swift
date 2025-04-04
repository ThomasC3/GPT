//
//  SettingsDataSource.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/30/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import UIKit

class SettingsDataSource: TableDataSource<SettingsItem> {

    var items = [SettingsItem]()

    override func registerCellIdentifiers(in tableView: UITableView) {
        super.registerCellIdentifiers(in: tableView)
        tableView.registerNib(SettingsTableViewCell.self)
    }

    override func refresh() {
        super.refresh()

        sections = [Section(rows: items)]
    }

    override func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let item = value(at: indexPath)

        let cell = tableView.dequeueCell(SettingsTableViewCell.self, for: indexPath)
        cell.configure(with: item)

        return cell
    }
}
