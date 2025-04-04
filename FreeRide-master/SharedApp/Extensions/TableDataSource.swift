//
//  TableDataSource.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/5/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import UIKit

open class TableDataSource<T>: DataSource<T>, UITableViewDataSource {

    /// This function can be overridden to include registration of all cells for the table
    open func registerCellIdentifiers(in tableView: UITableView) {
        // no-op
    }

    // MARK: - UITableViewDataSource
    open func numberOfSections(in tableView: UITableView) -> Int {
        return sections.count
    }

    open func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return sections[section].rows.count
    }

    open func tableView(_ tableView: UITableView, titleForHeaderInSection section: Int) -> String? {
        return sections[section].title
    }

    open func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let value = self.value(at: indexPath)

        if let cell = value as? UITableViewCell {
            return cell
        }

        fatalError()
    }
}
