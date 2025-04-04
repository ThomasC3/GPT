//
//  LocationsDataSource.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/22/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import UIKit

class LocationsDataSource: TableDataSource<LocationResponse> {

    weak var delegate: LocationsTableViewCellDelegate?

    override func registerCellIdentifiers(in tableView: UITableView) {
        super.registerCellIdentifiers(in: tableView)
        tableView.registerNib(LocationsTableViewCell.self)
    }

    func refresh(items: [LocationResponse]) {
        refresh()

        sections = [Section(rows: items)]
    }

    override func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let item = value(at: indexPath)

        let cell = tableView.dequeueCell(LocationsTableViewCell.self, for: indexPath)
        cell.configure(with: item)
        cell.delegate = delegate

        return cell
    }
}
